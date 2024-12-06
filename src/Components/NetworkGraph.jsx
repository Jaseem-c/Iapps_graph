

import React, { useEffect, useRef, useState } from "react";
import "./style.css";
import { ForceGraph2D } from "react-force-graph";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import companyImage from '../icons/company.png'
import factoryImg from '../icons/factory.png'
import machineImg from "../icons/factory.png"
import productImg from  '../icons/Product.png'

function NetworkGraph() {
  // state variables
  const [data, setData] = useState([]);
  const [searchValue, setsearchValue] = useState("");
  const fgRef = useRef(null); // Reference to the ForceGraph2D component
  const [hoveredNode, setHoveredNode] = useState(null); // Track hovered node
  

  // fetch data
  useEffect(() => {
    const url = searchValue
      ? `http://192.168.2.63:8080/graph/node/${searchValue}`
      : "http://192.168.2.63:8080/graph/";

    fetch(url) // Fetch data from your API
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((result) => {
        setData(result);
      })
      .catch((error) => {
        console.log("Error fetching data:", error.message);
      });
  }, [searchValue]);

  console.log(data);

  // Prepare the graph data structure
  const graphData = {
    nodes:
      data.nodes?.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        childcount: node.childcount,
      })) || [],
    links:
      data.links?.map((link) => ({
        source: link.from_node,
        target: link.to_node,
      })) || [],
  };

  // Function to determine node color based on depth
  const getNodeDepth = (node, graphData) => {
    let depth = 0;

    // Start with the root node (you can customize which node you consider as root)
    const visited = new Set();
    const dfs = (currentNode, currentDepth) => {
      if (visited.has(currentNode.id)) return;
      visited.add(currentNode.id);

      if (currentNode.id === node.id) {
        depth = currentDepth;
        return;
      }

      // Traverse all connected neighbors
      graphData.links.forEach((link) => {
        if (link.source.id === currentNode.id) {
          dfs(link.target, currentDepth + 1);
        }
        if (link.target.id === currentNode.id) {
          dfs(link.source, currentDepth + 1);
        }
      });
    };

    // Traverse from any node to find the depth
    graphData.nodes.forEach((n) => {
      dfs(n, 0);
    });
    return depth;
  };

    // Define colors based on depth
    const getNodeColor = (node, graphData) => {
      const depth = getNodeDepth(node, graphData);
      switch (depth) {
        case 0:
          return "black";
        case 1:
          return "blue";
        case 2:
          return "green"; 
        case 3:
          return "orangered"; 
          case 4:
            return "red"; 
        default:
          return "grey"; 
      }
    };

    // Determine node size based on depth
    const getNodeSize = (node, graphData) => {
      const depth = getNodeDepth(node, graphData);
      if (depth === 0) {
        return 9; // Root node size
      }
      return 6; // Default size for all other nodes
    };;

  // Fetch additional data when a node is clicked
  const handleNodeClick = (node) => {
    // Call another API to fetch additional nodes and links
    fetch(`http://192.168.2.63:8080/graph/node/${node.name}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((result) => {
        console.log(result);

        // Filter out duplicate nodes based on id
        const uniqueNodes = result.nodes.filter(
          (newNode) =>
            !data.nodes.some((existingNode) => existingNode.id === newNode.id)
        );

        // Filter out duplicate links based on source and target
        const uniqueLinks = result.links.filter(
          (newLink) =>
            !data.links.some(
              (existingLink) =>
                (existingLink.source === newLink.from_node &&
                  existingLink.target === newLink.to_node) ||
                (existingLink.source === newLink.to_node &&
                  existingLink.target === newLink.from_node)
            )
        );

        // Update the graph data with new unique nodes and links
        setData((prevData) => ({
          nodes: [...prevData.nodes, ...uniqueNodes], // Merge previous and new unique nodes
          links: [...prevData.links, ...uniqueLinks], // Merge previous and new unique links
        }));
      })
      .catch((error) => {
        console.log("Error fetching expanded data:", error.message);
      });
  };

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 20); // Adjust graph to fit within the container
    }
  }, [data]);

  

  return (
    <>
      <section className="section1">
        <div className="container">
          <div className="head">
            <h1>IndustryApps Dataspace</h1>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search here"
                onChange={(e) => setsearchValue(e.target.value)}
              />

              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                size="sm"
                className="search-icon"
              />
            </div>
          </div>
          <div className="graph-container">
            <ForceGraph2D
              graphData={graphData}
              nodeLabel={(node) => {
                const getImageForType = (type) => {
                  switch (type) {
                    case 'CY':
                      return `<img src="${companyImage}" alt="company" class="tooltip-img" />`;
                    case 'PT':
                      return `<img src="${factoryImg}" alt="factory" class="tooltip-img" />`;
                      case 'PDR':
                        return `<img src="${productImg}" alt="product" class="tooltip-img" />`;
                    default:
                      return `<img src="${machineImg}" alt="others" class="tooltip-img" />`;
                  }
                }
                
                return `  <div class="custom-tooltip">
                ${getImageForType(node.type)} 
                 <span> ${node.name}</span> 
                <p> ${node.type} </p>
                  </div>`;
              }}
            
              // onNodeHover={(node)=>setHoveredNode(node)}
              nodeColor={(node) => getNodeColor(node, graphData)} // Set color based on depth
              linkWidth={1.5}
              linkDirectionalArrowLength={0} // Remove the arrows
              linkDirectionalArrowRelPos={0}
              onNodeClick={handleNodeClick} // Attach the node click handler
              nodeCanvasObject={(node, ctx, globalScale) => {
                // Draw circle nodes without stroke
                const radius =getNodeSize(node, graphData) / globalScale; // Reduce node size
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = getNodeColor(node, graphData);
                ctx.fill();

                // Draw the label slightly above the node
                const label = node.name;
                const fontSize = 11 / globalScale;
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = "black"; // Label color
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, node.x, node.y - radius - 3); // Position label slightly above the circle
              }}
            />
           {/* {hoveredNode &&  <div class="custom-tooltip">
                 {getImageForType(node.type)}
                  <span> ${node.name}</span> 
                 <p> ${node.type} </p>
                 </div> } */}
          </div>
        </div>
      </section>
    </>
  );
}

export default NetworkGraph;
