import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Standard dimensions based on our shapes
const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;

export const getLayoutedElements = (
    nodes: Node[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'LR'
) => {
    // Determine the direction
    const isHorizontal = direction === 'LR';
    
    // Set up the graph and its configuration
    dagreGraph.setGraph({ 
        rankdir: direction,
        nodesep: 80,   // horizontal space between nodes
        ranksep: 100,  // vertical space between ranks
        marginx: 50,
        marginy: 50,
    });

    // Add nodes to dagre
    nodes.forEach((node) => {
        // Handle custom widths if they exist or lock, otherwise standard
        const width = node.style?.width ? Number(node.style.width) : NODE_WIDTH;
        const height = node.style?.height ? Number(node.style.height) : NODE_HEIGHT;
        
        // Dagre needs width and height to layout properly
        dagreGraph.setNode(node.id, { width, height });
    });

    // Add edges
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Execute the layout computation
    dagre.layout(dagreGraph);

    // Apply the computed positioned to our React Flow nodes
    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        
        // We are shifting the dagre node position (anchor=center center) 
        // to React Flow position (anchor=top left)
        const width = node.style?.width ? Number(node.style.width) : NODE_WIDTH;
        const height = node.style?.height ? Number(node.style.height) : NODE_HEIGHT;
        
        // Apply position
        node.position = {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
        };

        // Align target/source handles based on layout direction
        if (node.type === 'visioShape') {
            node.targetPosition = isHorizontal ? Position.Left : Position.Top;
            node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
        }

        return node;
    });

    return { nodes, edges };
};
