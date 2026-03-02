export const verdictColor = (v: string) => {
  switch (v.toLowerCase()) {
    case 'approved':
      return 'bg-green-900/30 text-green-400 border-green-700'
    case 'rejected':
      return 'bg-red-900/30 text-red-400 border-red-700'
    case 'pending':
      return 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
    default:
      return 'bg-gray-900/30 text-gray-400 border-gray-700'
  }
}

export const roleStyle = (r: string) => {
  switch (r) {
    case 'megawright':
      return 'text-purple-400 bg-purple-900/30 border-purple-700/50'
    case 'hq':
      return 'text-pink-400 bg-pink-900/30 border-pink-700/50'
    case 'captain':
      return 'text-blue-400 bg-blue-900/30 border-blue-700/50'
    case 'shipwright':
      return 'text-green-400 bg-green-900/30 border-green-700/50'
    case 'ysws_reviewer':
      return 'text-cyan-400 bg-cyan-900/30 border-cyan-700/50'
    case 'sw_ysws':
      return 'text-teal-400 bg-teal-900/30 border-teal-700/50'
    case 'fraudster':
      return 'text-orange-400 bg-orange-900/30 border-orange-700/50'
    case 'syswright':
      return 'text-red-400 bg-red-900/30 border-red-700/50'
    case 'observer':
      return 'text-gray-400 bg-gray-900/30 border-gray-700/50'
    default:
      return 'text-amber-300/60 bg-zinc-800 border-amber-900/30'
  }
}
