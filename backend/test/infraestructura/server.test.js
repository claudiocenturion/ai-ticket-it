import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const ejecutar = promisify(execFile);

test("El servidor informa EADDRINUSE si otro proceso ya reservó el puerto", async (contexto) => {
  const ocupado = createServer().listen(0, "0.0.0.0");
  await once(ocupado, "listening");
  contexto.after(() => new Promise((resolver) => ocupado.close(resolver)));
  const puerto = ocupado.address().port;
  const entrada = fileURLToPath(new URL("../../src/server.js", import.meta.url));

  await assert.rejects(ejecutar(process.execPath, [entrada], {
    env: { ...process.env, PORT: String(puerto), AI_TICKET_LOG_FORMAT: "texto" },
    timeout: 5000,
  }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, new RegExp(`El puerto ya está en uso \\(puerto ${puerto}, EADDRINUSE\\)`));
    assert.doesNotMatch(error.stderr, /TypeError/);
    assert.doesNotMatch(error.stdout, /Backend disponible/);
    return true;
  });
});
