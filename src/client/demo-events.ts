import { isDemoMode } from './api';
export type DemoView = {
  phase: 'board' | 'cascade' | 'result' | 'confirm-delete';
  selectedIds?: string[];
};
export function reportDemoView(view: DemoView): void {
  if (isDemoMode())
    window.dispatchEvent(new CustomEvent('blast-demo-view', { detail: view }));
}
