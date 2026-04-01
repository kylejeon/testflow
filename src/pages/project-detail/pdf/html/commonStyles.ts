export const PDF_PAGE_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; }
.a4-page { width: 794px; height: 1123px; background: #fff; position: relative; overflow: hidden; }
.pdf-header { height: 56px; background: rgb(99,102,241); display: table; width: 100%; }
.pdf-header-tall { height: 160px; background: linear-gradient(135deg, rgb(99,102,241) 0%, rgb(79,70,229) 50%, rgb(99,102,241) 100%); padding: 30px 80px 0; display: block; }
.logo { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: .3px; display: table-cell; vertical-align: middle; padding-left: 80px; }
.page-title { font-size: 11px; color: rgba(255,255,255,.85); display: table-cell; vertical-align: middle; text-align: right; padding-right: 80px; }
.pdf-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 48px; border-top: 1px solid rgb(226,232,240); }
.pdf-footer span { font-size: 10px; color: rgb(100,116,139); }
.pdf-content { padding: 20px 80px 60px; overflow: hidden; }
.sec-title { font-size: 14px; font-weight: 700; color: rgb(15,23,42); margin-bottom: 10px; margin-top: 16px; }
.sec-title:first-child { margin-top: 0; }
.kpi-card { background: rgb(248,250,252); border: 1px solid rgb(226,232,240); border-radius: 8px; padding: 12px 14px; }
.kpi-label { font-size: 9px; color: rgb(100,116,139); margin-bottom: 2px; }
.kpi-val { font-size: 20px; font-weight: 700; color: rgb(15,23,42); }
.kpi-delta { font-size: 10px; margin-top: 2px; }
.kpi-target { font-size: 9px; color: rgb(100,116,139); margin-top: 2px; }
.delta-up { color: rgb(16,163,127); }
.delta-down { color: rgb(239,68,68); }
.pdf-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.pdf-table th { background: rgb(248,250,252); font-size: 10px; font-weight: 700; color: rgb(15,23,42); text-align: left; padding: 7px 10px; border-bottom: 1px solid rgb(226,232,240); }
.pdf-table td { padding: 6px 10px; border-bottom: 1px solid rgb(226,232,240); color: rgb(15,23,42); vertical-align: middle; }
.pdf-table tr:nth-child(even) td { background: rgb(248,250,252); }
.c-pass { color: rgb(16,163,127); }
.c-fail { color: rgb(239,68,68); }
.c-block { color: rgb(249,115,22); }
.c-retest { color: rgb(234,179,8); }
.c-untested { color: rgb(100,116,139); font-style: italic; }
.c-light { color: rgb(100,116,139); }
.c-dark { color: rgb(15,23,42); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.badge-green { background: rgb(236,253,245); color: rgb(16,163,127); }
.badge-red { background: rgb(254,242,242); color: rgb(239,68,68); }
.badge-amber { background: rgb(255,251,235); color: rgb(245,158,11); }
.badge-indigo { background: rgb(238,242,255); color: rgb(99,102,241); }
.badge-gray { background: rgb(241,245,249); color: rgb(100,116,139); }
.dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 3px; vertical-align: middle; }
.dot-pass { background: rgb(16,163,127); }
.dot-fail { background: transparent; border: 2px solid rgb(239,68,68); }
.pri-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.prog-bar { height: 10px; background: rgb(226,232,240); border-radius: 3px; overflow: hidden; }
.prog-fill { height: 100%; border-radius: 3px; }
.stack-bar { display: block; font-size: 0; height: 22px; border-radius: 6px; overflow: hidden; white-space: nowrap; }
.stack-seg { display: inline-block; vertical-align: top; height: 100%; }
.chart-area { border: 1px solid rgb(226,232,240); border-radius: 4px; overflow: hidden; position: relative; }
`;
