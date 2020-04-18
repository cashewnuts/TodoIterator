import * as React from 'react';
import {
  render,
  fireEvent,
  waitForElement,
  screen
} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import TodoApp from '../TodoApp';

describe('TodoApp', () => {
  describe('rendering', () => {
    test('', () => {
      render(<TodoApp />);

      console.log(screen);
      expect(screen.getByRole('application')).toBeTruthy();
    });
  });
});
