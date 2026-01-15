import http.server
import socketserver

SERVER_PORT = 8000

request_handler_cls = http.server.SimpleHTTPRequestHandler
request_handler_cls.extensions_map.update(
    {
        ".js": "application/javascript",
    }
)

with socketserver.TCPServer(("", SERVER_PORT), request_handler_cls) as server:
    print(f"Servidor a rodar em http://localhost:{SERVER_PORT}")
    print(f"Abra: http://localhost:{SERVER_PORT}/index-simples.html")
    server.serve_forever()
