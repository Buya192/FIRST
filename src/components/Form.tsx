import React from 'react';
import styles from './Form.module.css';

export const Form: React.FC = () => {
  return (
    <div className={styles.form}>
      <h2>Form</h2>
      <form>
        <label htmlFor="name">Name:</label>
        <input type="text" id="name" name="name" />

        <label htmlFor="email">Email:</label>
        <input type="email" id="email" name="email" />

        {/* Add more form elements as needed */}
      </form>
    </div>
  );
};