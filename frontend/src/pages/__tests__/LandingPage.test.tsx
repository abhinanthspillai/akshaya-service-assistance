import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    
    // Check for Navbar elements
    expect(screen.getAllByText('SAHAYA').length).toBeGreaterThan(0);
    
    // Check for Hero section elements
    expect(screen.getByText(/Your Government/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore, apply and track government services/i)).toBeInTheDocument();
    
    // Check for specific buttons
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Services/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track Your Request/i })).toBeInTheDocument();
    
    // Check for feature cards
    expect(screen.getByText('Find a Service')).toBeInTheDocument();
    expect(screen.getByText('Submit Request')).toBeInTheDocument();
    expect(screen.getByText('Track Progress')).toBeInTheDocument();
    
    // Check stats
    expect(screen.getByText('50+')).toBeInTheDocument();
    expect(screen.getByText('2,900+')).toBeInTheDocument();
  });
});
