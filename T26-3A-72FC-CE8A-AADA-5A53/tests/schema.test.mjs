import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {checkDiagnosticsTable} from '../lib/diagnostics-schema.js';

test('primeiro diagnóstico inicializa o esquema, preservando dados em acessos posteriores', async () => {
  const sqlite = new DatabaseSync(':memory:');
  let batches = 0;
  const db = {
    prepare(sql) { return { sql, first: () => sqlite.prepare(sql).get() }; },
    async batch(statements) {
      batches++;
      for (const {sql} of statements) sqlite.exec(sql);
    }
  };
  try {
    await checkDiagnosticsTable(db);
    sqlite.exec("INSERT INTO project_records (user_id, username, chave_projeto, conteudo) VALUES ('1','Leitor','T26','Teste')");
    await checkDiagnosticsTable(db);
    assert.equal(batches, 1);
    assert.equal(sqlite.prepare('SELECT conteudo FROM project_records').get().conteudo, 'Teste');
  } finally { sqlite.close(); }
});
