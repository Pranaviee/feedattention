import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Page3 from '@/pages/Page3'

describe('Experiment section', () => {
  it('leads with recall vs context length from the checkpoint measurements', () => {
    render(<Page3 />)

    expect(screen.getByText('The theory gives an error bound.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The theory is a bound on approximation error; the curves below are measurements from our trained checkpoint. They are related evidence, not the same quantity.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Recall' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'L2 error' })).toHaveLength(1)
    expect(screen.getByText('More overlap means more cross-talk.')).toBeInTheDocument()
    expect(screen.queryByText('How many associations can a fixed table hold?')).not.toBeInTheDocument()
    expect(screen.queryByText('SNR — measured points, theory curve')).not.toBeInTheDocument()
    expect(screen.queryByText('Recall vs stored associations')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'The memory stayed fixed. The information did not disappear — it accumulated on top of earlier information.',
      ),
    ).toBeInTheDocument()

    expect(screen.getByText('C0 98.1%')).toBeInTheDocument()
    expect(screen.getByText('C2 83.3%')).toBeInTheDocument()
    expect(screen.getByText('C8 69.4%')).toBeInTheDocument()
    expect(screen.getByText('C0 44.0%')).toBeInTheDocument()
    expect(screen.getByText('C2 9.4%')).toBeInTheDocument()
    expect(screen.getByText('C8 4.8%')).toBeInTheDocument()
  })

  it('snaps t to a measured checkpoint row', () => {
    render(<Page3 />)
    const slider = screen.getByRole('slider', { name: /t =/ })
    expect(slider).toHaveAttribute('aria-valuetext', 't = 10')
    expect(slider).toHaveAttribute('max', String(14))

    fireEvent.change(slider, { target: { value: '14' } })
    expect(slider).toHaveAttribute('aria-valuetext', 't = 300')
    expect(screen.getByText(/Minimum required δ · n = 8192 · t = 300/)).toBeInTheDocument()
  })

  it('toggles checkpoint L2 without showing both metrics at once', async () => {
    const user = userEvent.setup()
    render(<Page3 />)

    expect(screen.getByRole('button', { name: 'Recall' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'L2 error' }))
    expect(screen.getByRole('button', { name: 'L2 error' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Recall' })).toHaveAttribute('aria-pressed', 'false')
  })
})
