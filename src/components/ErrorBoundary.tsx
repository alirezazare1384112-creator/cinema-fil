'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary — در صورتی که هر کامپوننتی در runtime با خطا مواجه بشه
 * (مثلاً undefined.split() یا دسترسی به فیلدِ اشتباه)، کل صفحهٔ سفید
 * نمی‌شه. به جای اون، یه پیام فارسیِ واضح با «تلاش دوباره» نشون می‌ده.
 *
 * در حالت dev، اطلاعاتِ stack رو هم نشون می‌ده.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] caught error:', error, info)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    const isDev = process.env.NODE_ENV === 'development'
    const err = this.state.error

    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            یه خطا پیش اومد
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            برنامه با یه مشکلِ غیرمنتظره مواجه شد. می‌تونی دوباره تلاش کنی یا
            صفحه رو رفرش کنی.
          </p>

          {isDev && err && (
            <details className="mb-6 text-right">
              <summary className="cursor-pointer text-xs text-gray-500 mb-2">
                جزئیات خطا (فقط در حالت توسعه)
              </summary>
              <pre className="bg-black/40 rounded-lg p-3 text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap break-all">
                {err.name}: {err.message}
                {err.stack ? `\n\n${err.stack}` : ''}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              تلاش دوباره
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
            >
              <Home className="w-4 h-4" />
              رفرش صفحه
            </button>
          </div>

          <p className="mt-6 text-[11px] text-gray-600">
            اگه خطا تکرار شد، لطفاً جزئیات خطا رو در{' '}
            <a
              href="https://github.com/alirezazare1384112-creator/cinema-fil/issues/new?labels=bug&template=bug_report.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              issue جدید
            </a>{' '}
            گزارش کن.
          </p>
        </div>
      </div>
    )
  }
}
