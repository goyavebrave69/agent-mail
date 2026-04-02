import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegenerateModal } from './regenerate-modal'

describe('RegenerateModal', () => {
  it('focuses textarea when opened', () => {
    render(
      <RegenerateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={false}
      />
    )

    expect(screen.getByRole('textbox', { name: /regeneration instructions/i })).toHaveFocus()
  })

  it('updates character count while typing', () => {
    render(
      <RegenerateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={false}
      />
    )

    fireEvent.change(screen.getByRole('textbox', { name: /regeneration instructions/i }), {
      target: { value: 'offer a 24h delay' },
    })

    expect(screen.getByText('17/200')).toBeInTheDocument()
  })

  it('calls onConfirm with null when regenerating without instruction', () => {
    const onConfirm = vi.fn()
    render(
      <RegenerateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /regenerate without instructions/i }))
    expect(onConfirm).toHaveBeenCalledWith(null)
  })

  it('calls onConfirm with trimmed instruction', () => {
    const onConfirm = vi.fn()
    render(
      <RegenerateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        isLoading={false}
      />
    )

    fireEvent.change(screen.getByRole('textbox', { name: /regeneration instructions/i }), {
      target: { value: '  be more formal  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /regenerate with instructions/i }))

    expect(onConfirm).toHaveBeenCalledWith('be more formal')
  })

  it('disables actions when loading', () => {
    render(
      <RegenerateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isLoading
      />
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    const loadingButtons = screen.getAllByRole('button', { name: /regenerating/i })
    expect(loadingButtons).toHaveLength(2)
    loadingButtons.forEach((button) => expect(button).toBeDisabled())
  })

  it('calls onClose on cancel click', () => {
    const onClose = vi.fn()
    render(
      <RegenerateModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
