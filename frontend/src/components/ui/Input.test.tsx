import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input', () => {
  it('associe le label au champ (même sans id explicite)', () => {
    render(<Input label="Nom complet" />);
    const input = screen.getByLabelText('Nom complet');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('marque le champ invalide et relie le message d’erreur', () => {
    render(<Input label="Email" error="Email invalide" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByText('Email invalide');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('n’est pas invalide en l’absence d’erreur', () => {
    render(<Input label="Nom" />);
    expect(screen.getByLabelText('Nom')).not.toHaveAttribute('aria-invalid');
  });
});
