const SETTINGS_SHELL_TEMPLATE = `
<div class="vnm-settings-shell" role="dialog" aria-modal="true" aria-label="设置">
  <div class="vnm-settings-head">
    <div class="vnm-settings-title">设置</div>
    <div class="vnm-settings-badge">{{version}}</div>
    <button class="vnm-settings-close" data-action="close" aria-label="关闭">×</button>
  </div>
  <div class="vnm-settings-tabs">{{tabs}}</div>
  <div class="vnm-settings-body">{{body}}</div>
</div>
`.trim();

export function getSettingsShellTemplate() {
    return SETTINGS_SHELL_TEMPLATE;
}
