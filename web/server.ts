import express from 'express';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
import { Lexer } from '../main/lexer';
import { Parser } from '../main/parser';
import { visualizeAST } from '../visualizer/ast-visualizer';
import localSetup, { BaseError, getErrorLog, getErrorHTML, type ErrorResponse } from '../util/errors';

const app = express();

app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

const allowedFiles = [
    '/index.html',
    '/main.jv',
    '/ast-visualizer.js'
];

app.get('/', (req, res) => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    res.sendFile(path.join(__dirname, 'index.html'));
});

function handle_err(res: express.Response, err: ErrorResponse, input: string = ''): void {
    const errorData = err as any;
    res.status(400).json({
        name: err.name,
        error: err.name,
        message: errorData.message || 'Compilation error',
        source: errorData.source || { pos: 0, line: 1, col: 1 },
        log: getErrorLog(errorData, input),
        htmlLog: getErrorHTML(errorData, input)
    });
}

app.use(express.json());

app.post('/validate', (req, res) => {
    try {
        const { code } = req.body;

        if (typeof code != "string") {
            return res.status(400).json({
                success: false
            })
        }

        const localErrors = localSetup((err, errClass) => {
            handle_err(res, err, code);
        });

        let startTime = Date.now();
        const lexer = new Lexer(localErrors);
        const tokens = lexer.tokenize(code);

        if(tokens instanceof BaseError) return;

        const tokenTime = Date.now() - startTime;

        const parser = new Parser(localErrors);
        const ast = parser.parse(tokens);

        if(ast instanceof BaseError) return;

        const parseTime = Date.now() - startTime;

        res.json({
            success: true,
            ast: ast,
            timing: {
                tokenization: tokenTime,
                parsing: parseTime
            }
        });
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

app.get('/main.jv', (req, res) => {
    const filePath = path.join(__dirname, '../main.jv');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    });
});

app.get('/ast-visualizer.js', (req, res) => {
    const filePath = path.join(__dirname, 'ast-visualizer.js');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.setHeader('Content-Type', 'application/javascript');
        res.send(data);
    });
});

app.get('/error-display.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'error-display.css'));
});

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!allowedFiles.includes(req.path)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    res.status(404).json({ error: 'File not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Javon Editor running securely at http://0.0.0.0:${PORT}`);
});