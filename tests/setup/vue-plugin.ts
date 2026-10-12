import { plugin } from 'bun';
import { compileScript, parse } from '@vue/compiler-sfc';

// bun test cannot load .vue files; compile single-file components on load.
plugin({
  name: 'vue-sfc',
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const { descriptor } = parse(source, { filename: args.path });
      const id = Bun.hash(args.path).toString(16);
      const script = compileScript(descriptor, { id, inlineTemplate: true });
      return { contents: script.content, loader: 'ts' };
    });
  },
});
