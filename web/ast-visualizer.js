class ASTCanvasVisualizer {
    constructor(canvas) {
        this.nodes = [];
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.NODE_HEIGHT = 40;
        this.NODE_PADDING = 15;
        this.LEVEL_SPACING = 80;
        this.SIBLING_SPACING = 60;
        this.maxX = 0;
        this.maxY = 0;
        this.isShowingError = false;

        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Cannot get 2D context from canvas');
        }
        this.ctx = context;
        this.setupCanvas();
        this.bindEvents();
        this.createErrorDisplay();
    }

    createErrorDisplay() {
        this.errorDisplay = document.createElement('div');
        this.errorDisplay.id = 'ast-error-display';

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '×';

        closeButton.addEventListener('click', () => {
            this.isShowingError = false;
            this.canvas.style.display = 'block';
            this.errorDisplay.style.display = 'none';
        });

        this.errorDisplay.appendChild(closeButton);

        const canvasContainer = this.canvas.parentElement;
        if (canvasContainer) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(this.errorDisplay);
        }
    }

    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.render();
        };
        window.addEventListener('resize', resize);
        resize();
    }
    
    resizeCanvasForError() {
        if (this.isShowingError) {
            this.canvas.style.height = '50%';
        } else {
            this.canvas.style.height = '400px';
        }
        
        setTimeout(() => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.render();
        }, 100);
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isShowingError) return;
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && !this.isShowingError) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                const rect = this.canvas.getBoundingClientRect();
                const canvasWidth = rect.width;
                const canvasHeight = rect.height;
                const scaledContentWidth = this.maxX * this.scale;
                const scaledContentHeight = this.maxY * this.scale;

                const padding = 100;
                const maxOffsetX = Math.max(0, scaledContentWidth - canvasWidth + padding);
                const maxOffsetY = Math.max(0, scaledContentHeight - canvasHeight + padding);

                this.offsetX = Math.max(-maxOffsetX, Math.min(padding, this.offsetX + deltaX));
                this.offsetY = Math.max(-maxOffsetY, Math.min(padding, this.offsetY + deltaY));

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.render();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            if (this.isShowingError) return;
            e.preventDefault();
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= scaleFactor;
            this.scale = Math.max(0.1, Math.min(2, this.scale));
            this.render();
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging && !this.isShowingError) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left - this.offsetX) / this.scale;
                const y = (e.clientY - rect.top - this.offsetY) / this.scale;
                this.handleNodeClick(x, y);
            }
        });

        this.canvas.addEventListener('dblclick', (e) => {
            if (!this.isShowingError) {
                this.resetView();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isShowingError) {
                this.isShowingError = false;
                this.canvas.style.display = 'block';
                this.errorDisplay.style.display = 'none';
            }
        });
    }

    handleNodeClick(x, y) {
        const clickedNode = this.findNodeAt(x, y, this.nodes);
        if (clickedNode) {
            clickedNode.collapsed = !clickedNode.collapsed;
            this.layoutNodes();
            this.render();
        }
    }

    findNodeAt(x, y, nodes) {
        for (const node of nodes) {
            if (x >= node.x && x <= node.x + node.width &&
                y >= node.y && y <= node.y + node.height) {
                return node;
            }
            if (!node.collapsed) {
                const found = this.findNodeAt(x, y, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    visualizeAST(ast) {
        this.isShowingError = false;
        this.canvas.style.display = 'block';
        this.errorDisplay.style.display = 'none';
        this.nodes = this.convertASTToCanvasNodes(ast);
        this.layoutNodes();
        this.render();
        this.resizeCanvasForError();
    }

    convertASTToCanvasNodes(ast) {
        const createNode = (node) => {
            const text = this.getNodeText(node);
            const canvasNode = {
                x: 0,
                y: 0,
                width: 0,
                height: this.NODE_HEIGHT,
                text,
                children: [],
                collapsed: false,
                node
            };

            for (const [key, value] of Object.entries(node)) {
                if (key === 'type' || key === 'loc') continue;

                if (Array.isArray(value)) {
                    value.forEach((item) => {
                        if (item && typeof item === 'object' && item.type) {
                            canvasNode.children.push(createNode(item));
                        }
                    });
                } else if (value && typeof value === 'object' && value.type) {
                    canvasNode.children.push(createNode(value));
                }
            }

            return canvasNode;
        };

        return [createNode(ast)];
    }

    getNodeText(node) {
        let text = node.type;

        if (node.name) text += ` (${node.name})`;
        if (node.value !== undefined) text += ` = ${node.value}`;
        if (node.operator) text += ` [${node.operator}]`;

        return text;
    }

    layoutNodes() {
        if (this.nodes.length === 0) return;

        this.maxX = 0;
        this.maxY = 0;

        const calculateSubtreeWidth = (node) => {
            if (node.collapsed || node.children.length === 0) {
                return 200;
            }

            let totalWidth = 0;
            for (const child of node.children) {
                totalWidth += calculateSubtreeWidth(child);
            }
            return Math.max(200, totalWidth);
        };

        const layoutNode = (node, x, y, level) => {
            this.ctx.font = '14px monospace';
            const textWidth = this.ctx.measureText(node.text).width;
            node.width = Math.max(textWidth + this.NODE_PADDING * 2, 120);

            node.x = x - node.width / 2;
            node.y = y;

            this.maxX = Math.max(this.maxX, node.x + node.width + 100);
            this.maxY = Math.max(this.maxY, y + this.NODE_HEIGHT + 100);

            if (!node.collapsed && node.children.length > 0) {
                const childY = y + this.LEVEL_SPACING;

                if (node.children.length === 1) {
                    layoutNode(node.children[0], x, childY, level + 1);
                } else {
                    let totalSubtreeWidth = 0;
                    const subtreeWidths = node.children.map(child => {
                        const width = calculateSubtreeWidth(child);
                        totalSubtreeWidth += width;
                        return width;
                    });

                    let currentX = x - totalSubtreeWidth / 2;

                    for (let i = 0; i < node.children.length; i++) {
                        const child = node.children[i];
                        const childCenterX = currentX + subtreeWidths[i] / 2;
                        layoutNode(child, childCenterX, childY, level + 1);
                        currentX += subtreeWidths[i];
                    }
                }
            }
        };

        const rect = this.canvas.getBoundingClientRect();
        const startX = rect.width / (2 * window.devicePixelRatio);
        layoutNode(this.nodes[0], startX, 50, 0);
    }

    render() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        this.renderNodes(this.nodes);

        this.ctx.restore();
    }

    renderNodes(nodes) {
        for (const node of nodes) {
            this.renderConnections(node);
        }

        for (const node of nodes) {
            this.renderNode(node);
            if (!node.collapsed) {
                this.renderNodes(node.children);
            }
        }
    }

    renderNode(node) {
        this.ctx.fillStyle = node.collapsed && node.children.length > 0 ? '#4a90e2' : '#2d3748';
        this.ctx.fillRect(node.x, node.y, node.width, node.height);

        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(node.x, node.y, node.width, node.height);

        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(
            node.text,
            node.x + this.NODE_PADDING,
            node.y + this.NODE_HEIGHT / 2 + 5
        );

        if (node.children.length > 0) {
            this.ctx.fillStyle = '#a0aec0';
            const indicatorX = node.x + node.width - 20;
            const indicatorY = node.y + this.NODE_HEIGHT / 2;
            this.ctx.fillText(node.collapsed ? '▶' : '▼', indicatorX, indicatorY + 5);
        }
    }

    renderConnections(node) {
        if (node.collapsed || node.children.length === 0) return;

        this.ctx.strokeStyle = '#718096';
        this.ctx.lineWidth = 1.5;

        const nodeCenter = {
            x: node.x + node.width / 2,
            y: node.y + this.NODE_HEIGHT
        };

        for (const child of node.children) {
            const childCenter = {
                x: child.x + child.width / 2,
                y: child.y
            };

            this.ctx.beginPath();
            this.ctx.moveTo(nodeCenter.x, nodeCenter.y);

            if (node.children.length === 1) {
                this.ctx.lineTo(childCenter.x, childCenter.y);
            } else {
                const midY = nodeCenter.y + (childCenter.y - nodeCenter.y) / 2;
                this.ctx.lineTo(nodeCenter.x, midY);
                this.ctx.lineTo(childCenter.x, midY);
                this.ctx.lineTo(childCenter.x, childCenter.y);
            }
            this.ctx.stroke();
        }
    }

    showError(errorData) {
        this.isShowingError = true;
        this.canvas.style.display = 'block';
        this.errorDisplay.style.display = 'block';

        this.errorDisplay.innerHTML = errorData;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => {
            this.isShowingError = false;
            this.errorDisplay.style.display = 'none';
            this.resizeCanvasForError();
        });
        
        this.errorDisplay.appendChild(closeButton);
        this.resizeCanvasForError();
    }

    resetView() {
        const rect = this.canvas.getBoundingClientRect();
        this.scale = Math.min(1, rect.width / this.maxX, rect.height / this.maxY);
        this.offsetX = Math.max(0, (rect.width - this.maxX * this.scale) / 2);
        this.offsetY = 20;
        this.render();
    }

    clear() {
        this.isShowingError = false;
        this.canvas.style.display = 'block';
        this.errorDisplay.style.display = 'none';
        this.errorDisplay.innerHTML = '';
        this.resizeCanvasForError();
    }
}

class EditorManager {
    constructor() {
        this.debounceTimer = 0;
        this.DEBOUNCE_DELAY = 1000;
        this.setupCanvas();
    }

    setupCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'ast-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '400px';
        canvas.style.border = '1px solid #ccc';
        canvas.style.marginTop = '20px';
        canvas.style.cursor = 'grab';

        const container = document.getElementById('container');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(canvas, container.nextSibling);
        }

        this.visualizer = new ASTCanvasVisualizer(canvas);
    }

    initializeEditor(editor) {
        this.editor = editor;
        this.validateCode();
        editor.onDidChangeModelContent(() => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = window.setTimeout(() => {
                this.validateCode();
            }, this.DEBOUNCE_DELAY);
        });
    }

    async validateCode() {
        if (!this.editor) return;

        const code = this.editor.getValue();

        try {
            const response = await fetch('/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            const result = await response.json();

            if (result.success && result.ast) {
                this.visualizer.visualizeAST(result.ast);
            } else {
                this.visualizer.showError(result.htmlLog || result.log || 'Unknown error');
            }
        } catch (error) {
            console.error('Validation request failed:', error);
            this.visualizer.showError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

let editorManager;

function initializeEditorManager() {
    editorManager = new EditorManager();
    if (typeof window !== 'undefined') {
        window.editorManager = editorManager;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEditorManager);
} else {
    initializeEditorManager();
}

export {};