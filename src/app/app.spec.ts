import { render, screen } from '@testing-library/angular';
import { App } from './app';

describe('App', () => {
  it('should create the app', async () => {
    const { fixture } = await render(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title', async () => {
    await render(App);
    const heading = screen.queryByRole('heading', { level: 1 });
    expect(heading?.textContent).toContain('Hello, cadmus-bricks-shell-v3');
  });
});
