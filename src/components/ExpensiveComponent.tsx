import React, { useState, useMemo, useCallback } from 'react';

interface ExpensiveComponentProps {
  initialValue: number;
}

const ExpensiveComponent: React.FC<ExpensiveComponentProps> = ({ initialValue }) => {
  const [count, setCount] = useState(initialValue);

  const expensiveCalculation = (num: number): number => {
    console.log('Calculating...');
    for (let i = 0; i < 1000000000; i++) {
      num += 1;
    }
    return num;
  };

  const memoizedValue = useMemo(() => expensiveCalculation(count), [count]);

  const handleIncrement = useCallback(() => {
    setCount((prevCount) => prevCount + 1);
  }, []);

  const handleDecrement = useCallback(() => {
    setCount((prevCount) => prevCount - 1);
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Expensive Component</h2>
      <p className="mb-2">Count: {count}</p>
      <p className="mb-4">Expensive Calculation Result: {memoizedValue}</p>
      <div className="flex space-x-2">
        <button
          onClick={handleIncrement}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Increment
        </button>
        <button
          onClick={handleDecrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrement
        </button>
      </div>
    </div>
  );
};

export default ExpensiveComponent;