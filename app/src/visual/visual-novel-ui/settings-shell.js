const SETTINGS_SHELL_TEMPLATE = `
<div class="vn-settings-shell" role="dialog" aria-modal="true" aria-label="设置">
  <div class="vn-settings-head">
    <div class="vn-settings-title">设置</div>
    <div class="vn-settings-badge">{{version}}</div>
    <button class="vn-settings-close" data-action="close" aria-label="关闭">×</button>
  </div>
  <div class="vn-settings-tabs">{{tabs}}</div>
  <div class="vn-settings-body">{{body}}</div>
</div>
`.trim();

export function getSettingsShellTemplate() {
    return SETTINGS_SHELL_TEMPLATE;
}
