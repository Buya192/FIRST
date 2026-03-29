import { render, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  test('Button memanggil onClick ketika diklik', () => {
    const handleClick = jest.fn();
    const { getByText } = render(<Button onClick={handleClick}>Test Button</Button>);
    fireEvent.click(getByText('Test Button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});