
interface ASTNode {
  type: string;
  loc?: {
    line: number;
    col: number;
  };
  [key: string]: any;
}

interface ValidationResponse {
  success: boolean;
  ast?: ASTNode;
  visualAST?: string;
  timing?: {
    tokenization: number;
    parsing: number;
  };
  error?: string;
  message?: string;
}

interface CanvasNode {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  children: CanvasNode[];
  collapsed: boolean;
  node: ASTNode;
}

class ASTCanvasVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: CanvasNode[] = [];
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private readonly NODE_HEIGHT = 30;
  private readonly NODE_PADDING = 10;
  private readonly LEVEL_SPACING = 150;
  private readonly SIBLING_SPACING = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Cannot get 2D context from canvas');
    }
    this.ctx = context;
    this.setupCanvas();
    this.bindEvents();
  }

  private setupCanvas(): void {
    const resize = (): void => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.render();
    };

    window.addEventListener('resize', resize);
    resize();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.offsetX += deltaX;
        this.offsetY += deltaY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.render();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale *= scaleFactor;
      this.scale = Math.max(0.1, Math.min(3, this.scale));
      this.render();
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.isDragging) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.scale;
        const y = (e.clientY - rect.top - this.offsetY) / this.scale;
        this.handleNodeClick(x, y);
      }
    });
  }

  private handleNodeClick(x: number, y: number): void {
    const clickedNode = this.findNodeAt(x, y, this.nodes);
    if (clickedNode) {
      clickedNode.collapsed = !clickedNode.collapsed;
      this.render();
    }
  }

  private findNodeAt(x: number, y: number, nodes: CanvasNode[]): CanvasNode | null {
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

  public visualizeAST(ast: ASTNode): void {
    this.nodes = this.convertASTToCanvasNodes(ast);
    this.layoutNodes();
    this.render();
  }

  private convertASTToCanvasNodes(ast: ASTNode): CanvasNode[] {
    const createNode = (node: ASTNode): CanvasNode => {
      const text = this.getNodeText(node);
      const canvasNode: CanvasNode = {
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
          value.forEach((item: any) => {
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

  private getNodeText(node: ASTNode): string {
    let text = node.type;
    
    if (node.name) text += ` (${node.name})`;
    if (node.value !== undefined) text += ` = ${node.value}`;
    if (node.operator) text += ` [${node.operator}]`;
    
    if (node.loc) {
      text += ` @${node.loc.line}:${node.loc.col}`;
    }
    
    return text;
  }

  private layoutNodes(): void {
    let currentY = 50;
    
    const layoutNode = (node: CanvasNode, x: number, level: number): number => {
      this.ctx.font = '14px monospace';
      const textWidth = this.ctx.measureText(node.text).width;
      node.width = textWidth + this.NODE_PADDING * 2;
      
      node.x = x;
      node.y = currentY;
      currentY += this.SIBLING_SPACING;
      
      if (!node.collapsed && node.children.length > 0) {
        let childX = x + this.LEVEL_SPACING;
        for (const child of node.children) {
          layoutNode(child, childX, level + 1);
        }
      }
      
      return currentY;
    };

    this.nodes.forEach(node => layoutNode(node, 50, 0));
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    
    this.renderNodes(this.nodes);
    
    this.ctx.restore();
  }

  private renderNodes(nodes: CanvasNode[]): void {
    for (const node of nodes) {
      this.renderNode(node);
      if (!node.collapsed) {
        this.renderConnections(node);
        this.renderNodes(node.children);
      }
    }
  }

  private renderNode(node: CanvasNode): void {
    this.ctx.fillStyle = node.collapsed && node.children.length > 0 ? '#4a90e2' : '#f0f0f0';
    this.ctx.fillRect(node.x, node.y, node.width, node.height);
    
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(node.x, node.y, node.width, node.height);
    
    this.ctx.fillStyle = '#333';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(
      node.text,
      node.x + this.NODE_PADDING,
      node.y + this.NODE_HEIGHT / 2 + 5
    );
    
    if (node.children.length > 0) {
      this.ctx.fillStyle = '#666';
      const indicatorX = node.x + node.width - 15;
      const indicatorY = node.y + this.NODE_HEIGHT / 2;
      this.ctx.fillText(node.collapsed ? '+' : '-', indicatorX, indicatorY + 5);
    }
  }

  private renderConnections(node: CanvasNode): void {
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 1;
    
    for (const child of node.children) {
      this.ctx.beginPath();
      this.ctx.moveTo(node.x + node.width, node.y + this.NODE_HEIGHT / 2);
      this.ctx.lineTo(child.x, child.y + this.NODE_HEIGHT / 2);
      this.ctx.stroke();
    }
  }

  public showError(message: string): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText(`Error: ${message}`, 20, 40);
  }

  public clear(): void {
    this.nodes = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

class EditorManager {
  private editor: any;
  private visualizer!: ASTCanvasVisualizer;
  private debounceTimer: number = 0;
  private readonly DEBOUNCE_DELAY = 500;

  constructor() {
    this.setupCanvas();
  }

  private setupCanvas(): void {
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

  public initializeEditor(editor: any): void {
    this.editor = editor;
    
    this.validateCode();
    
    editor.onDidChangeModelContent(() => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.validateCode();
      }, this.DEBOUNCE_DELAY);
    });
  }

  private async validateCode(): Promise<void> {
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

      const result: ValidationResponse = await response.json();

      if (result.success && result.ast) {
        this.visualizer.visualizeAST(result.ast);
      } else {
        const errorMessage = result.error || result.message || 'Unknown error';
        this.visualizer.showError(errorMessage);
      }
    } catch (error) {
      console.error('Validation request failed:', error);
      this.visualizer.showError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

let editorManager: EditorManager | undefined;

function initializeEditorManager(): void {
  editorManager = new EditorManager();
  if (typeof window !== 'undefined') {
    (window as any).editorManager = editorManager;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEditorManager);
} else {
  initializeEditorManager();
}

export {};

declare global {
  interface Window {
    editorManager: EditorManager;
  }
}
