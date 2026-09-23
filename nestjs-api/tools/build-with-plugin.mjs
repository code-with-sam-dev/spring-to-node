// Compiles the episode 10 plugin demo with the @nestjs/swagger CLI plugin's
// transformer, which is exactly what adding
//   "compilerOptions": { "plugins": ["@nestjs/swagger/plugin"] }
// to nest-cli.json does under the hood.
//
//   node tools/build-with-plugin.mjs && node dist/ep09-plugin/run.js
//
// Done this way rather than by editing nest-cli.json so that the demo is
// self contained and the application's own build is unchanged.
//
// PLUGIN OPTIONS ARE DELIBERATELY LEFT AT THEIR DEFAULTS. The point of the
// demo is that the defaults include a filename filter, and widening it here
// would hide the behaviour being measured.
import ts from 'typescript';
import { before } from '@nestjs/swagger/plugin';

const files = ['src/ep09-docs/plugin-demo/run.ts'];
const options = {
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2023,
  skipLibCheck: true,
  outDir: 'dist/ep09-plugin',
  rootDir: 'src/ep09-docs/plugin-demo',
  types: ['node'],
};
const program = ts.createProgram(files, options);
const result = program.emit(undefined, undefined, undefined, undefined, {
  before: [before({ introspectComments: false }, program)],
});
const diags = ts.getPreEmitDiagnostics(program)
  .concat(result.diagnostics)
  .filter((d) => d.file && d.file.fileName.includes('plugin-demo'));
for (const d of diags) {
  console.error(ts.flattenDiagnosticMessageText(d.messageText, ' '));
}
if (diags.length) process.exit(1);
