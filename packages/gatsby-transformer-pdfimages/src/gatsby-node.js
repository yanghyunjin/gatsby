const _ = require(`lodash`)
const crypto = require(`crypto`)
const execa = require(`execa`)
const path = require(`path`)

const pdfNodes = []

async function onCreateNode({
  node,
  boundActionCreators,
  loadNodeContent,
  cacheDir,
}) {
  const { createNode, updateNode, createParentChildLink } = boundActionCreators

  console.log(node.internal.mediaType)
  // Check if this is a File node that's a newly created child of a PDF File.
  // If it is, create a parent/child link.
  if (
    node.internal.type === `File` &&
    // node.internal.mediaType !== `application/pdf` &&
    // Remove once we upgrade node-sharp to v0.18 which supports tiff.
    // node.internal.mediaType !== `image/tiff` &&
    node.internal.mediaType === `image/png` &&
    _.some(pdfNodes, p => p.name === node.name.slice(0, p.name.length))
  ) {
    createParentChildLink({
      parent: _.find(
        pdfNodes,
        p => p.name === node.name.slice(0, p.name.length)
      ),
      child: node,
    })
  }

  if (node.internal.mediaType !== `application/pdf`) {
    // We only care about PDF content. TODO what's the mime type?
    return
  }

  pdfNodes.push(node)

  const content = await loadNodeContent(node)

  // Delete any images from this PDF so we avoid images being left
  // after they're removed from a PDF
  try {
    await execa.shell(`rm ${path.join(cacheDir, node.name)}*`)
  } catch (e) {
    // ignore
  }

  const output = await execa.shell(
    `pdfimages -all "${node.absolutePath}" "${path.join(cacheDir, node.name)}"`
  )

  console.log("done creating pdf images")
  return
  // Create a node per image and write out files to a directory in the
  // cache. Need new API to get a directory for caching. Use plugin name
  // for it. How to create the file nodes from the new images? Need to set
  // this PDFImage thing as the parent... or not. Perhaps just create
  // files directly which are children of these files? Or these are a different
  // type but set the media-type to what sharp understands and get sharp
  // to work with types not "File" just as long as there's an absolutePath
  // on the node.
  //
  // TODO use promises of transformers to figure out when they're actually
  // done.
  const JSONArray = JSON.parse(content).map((obj, i) => {
    const objStr = JSON.stringify(obj)
    const contentDigest = crypto.createHash(`md5`).update(objStr).digest(`hex`)

    return {
      ...obj,
      id: obj.id ? obj.id : `${node.id} [${i}] >>> JSON`,
      contentDigest,
      parent: node.id,
      // TODO make choosing the "type" a lot smarter. This assumes
      // the parent node is a file.
      // PascalCase
      type: _.upperFirst(_.camelCase(`${node.name} Json`)),
      children: [],
    }
  })

  node.children = node.children.concat(JSONArray.map(n => n.id))
  updateNode(node)
  _.each(JSONArray, j => createNode(j))

  return
}

exports.onCreateNode = onCreateNode
