import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders with default props', () => {
    render(<LoadingScreen />);
    
    expect(screen.getByText('Initializing Syntari AI IDE')).toBeInTheDocument();
    expect(screen.getByText('Loading AI providers and enterprise features...')).toBeInTheDocument();
  });

  it('renders with custom message and submessage', () => {
    const customMessage = 'Custom Loading Message';
    const customSubmessage = 'Custom submessage';
    
    render(
      <LoadingScreen 
        message={customMessage} 
        submessage={customSubmessage} 
      />
    );
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.getByText(customSubmessage)).toBeInTheDocument();
  });

  it('has proper loading spinner', () => {
    const { container } = render(<LoadingScreen />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-12', 'w-12', 'border-b-2', 'border-blue-500');
  });

  it('has proper styling classes', () => {
    const { container } = render(<LoadingScreen />);
    
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('flex', 'items-center', 'justify-center', 'h-full', 'bg-gray-900', 'text-white');
  });
}); 