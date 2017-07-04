import { ChartPage } from './app.po';

describe('chart App', () => {
  let page: ChartPage;

  beforeEach(() => {
    page = new ChartPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!!');
  });
});
