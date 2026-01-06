import { UAParser } from 'ua-parser-js'

export function parse(ua: string | null) {
  if (!ua) return { os: 'Unknown', browser: 'Unknown', device: null }

  const p = new UAParser(ua)
  const os = p.getOS()
  const browser = p.getBrowser()
  const device = p.getDevice()

  let osStr = 'Unknown OS'
  if (os.name) {
    osStr = os.name
    if (os.name === 'Windows' && os.version === '10') {
      osStr = 'Windows'
    } else if (os.version) {
      osStr += ` ${os.version}`
    }
  }

  let browserStr = 'Unknown Browser'
  if (browser.name) {
    browserStr = browser.name
  }

  return {
    os: osStr,
    browser: browserStr,
    device: device.model || device.type || null,
  }
}
