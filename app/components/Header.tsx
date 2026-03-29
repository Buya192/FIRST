import React from 'react';

export default function Header() {
  return (
    <header className="bg-white shadow-sm mb-8">
      <nav className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <h1 className="text-2xl font-bold">Logo</h1>
        <ul className="flex space-x-4">
          <li><a href="/" className="hover:text-blue-600 transition-colors">Beranda</a></li>
          <li><a href="/fitur" className="hover:text-blue-600 transition-colors">Fitur</a></li>
          <li><a href="/kontak" className="hover:text-blue-600 transition-colors">Kontak</a></li>
        </ul>
      </nav>
    </header>
  );
}