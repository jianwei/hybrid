const ALLOWED_CSS_UNITS = [
  'px',
  'ms',
  's',
  'deg',
  'grad',
  'rad',
  'turn',
  'hz',
  'khz',
  'dpi',
  'dpcm',
  'dppx',
  'x'
]

/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-standard',
  rules: {
    'no-empty-source': null,
    'unit-allowed-list': ALLOWED_CSS_UNITS
  }
}
