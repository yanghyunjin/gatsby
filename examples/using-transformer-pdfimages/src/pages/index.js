import React from "react"

class IndexComponent extends React.Component {
  render() {
    console.log(this.props)
    return (
      <div>
        {this.props.data.allFile.edges.map(({ node }) => {
          return (
            <div>
              <h2>
                {node.name}
                <div>
                  {node.children.map(child => {
                    return (
                      <img
                        height={child.children[0].responsiveResolution.height}
                        width={child.children[0].responsiveResolution.width}
                        srcSet={child.children[0].responsiveResolution.srcSet}
                        src={child.children[0].responsiveResolution.src}
                        style={{ marginRight: 10, marginBottom: 10 }}
                      />
                    )
                  })}
                </div>
              </h2>
            </div>
          )
        })}
      </div>
    )
  }
}

export default IndexComponent

export const pageQuery = graphql`
  query IndexQuery {
    allFile(filter: { internal: { mediaType: { eq: "application/pdf" } } }) {
      edges {
        node {
          id
          name
          children {
            id
            children {
              id
              ... on ImageSharp {
                responsiveResolution(width: 300) {
                  base64
                  aspectRatio
                  width
                  height
                  src
                  srcSet
                }
              }
            }
          }
        }
      }
    }
  }
`
