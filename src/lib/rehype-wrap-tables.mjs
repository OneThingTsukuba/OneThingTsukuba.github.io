/**
 * Markdown が出力する <table> を、横スクロールできる <div> で包む rehype プラグイン。
 *
 * table 自体に display: block を当てても横スクロールはできるが、
 * 一部のブラウザでアクセシビリティツリーから表としての意味が失われ、
 * スクリーンリーダーが表として読み上げなくなる。
 * だから table の display は table のまま残し、外側の要素にスクロールを持たせる。
 *
 * 依存を増やしたくないので unist-util-visit は使わず、自前で木をたどる。
 */
export function rehypeWrapTables() {
  return (tree) => {
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = node.children.map((child) => {
        walk(child);

        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              // キーボードでも横スクロールできるようにフォーカスを持たせる。
              // role と aria-label が無いと、ただの入れ物に焦点が当たって読み上げが不親切になる
              tabindex: 0,
              role: 'region',
              'aria-label': '表（横にスクロールできます）',
            },
            children: [child],
          };
        }

        return child;
      });
    };

    walk(tree);
  };
}
