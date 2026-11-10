// AUXだけ無音の切り分けガイド（aux-no-sound）の表示設定。scripts/build-guide.mjs が読む。
export default {
  headingIds: { '症状': 'symptoms', '原因候補': 'causes', '何を測るか': 'what-to-measure', '使う道具': 'tools', '関連する実測': 'measurements', '次に読む': 'next' },
  // no `images` key (image-less guide)
  toolboxRef: 'auxguide-toolbox',
  breadcrumbs: '<a href="/">や印工務店</a> ／ <a href="/#guides">Guide</a> ／ AUXだけ無音の切り分け',
  kicker: 'GUIDE ／ ELECTRONICS — TROUBLESHOOTING',
  heroTitle: 'Bluetoothは鳴るのにAUXだけ無音<br />3.5mmジャックの挿入検出DETをテスターで切り分ける',
  dek: 'Bluetoothは鳴るのに、AUX入力だけ音が出ない。<br />純正ジャックと外部ジャックの違いを、導通チェックで確かめる手順にまとめました。',
  facts: (frontmatter) => [{ text: '● 切り分け', level: true }, { text: `約${frontmatter.estimated_minutes}分` }, { text: '実測あり' }, { text: '失敗例あり' }],
  tocIncludesSteps: false,
  toolLink: { href: 'https://apps.yzrswork.com/fixit/?yzrs_ref=auxguide-fixit#aux-no-sound', text: 'Fix-itで切り分ける →' },
  origin: ['<strong>note記事を、切り分け手順の型で再編集。</strong>', '「Bluetoothは鳴るのにAUXは無音。YS-AP50Lの挿入検出DETを追った話」を、症状→原因候補→何を測るか の順に並べ直しています。'],
  affiliateDisclosure: false,
};
