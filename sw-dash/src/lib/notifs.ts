export const msgs = {
  ticket: {
    assigned: (ticketId: string) => ({
      title: `🎫 ticket #${ticketId}`,
      body: `was assigned to you!`,
      url: `/admin/tickets/${ticketId}`,
    }),
    unassigned: (ticketId: string) => ({
      title: `🎫 ticket #${ticketId}`,
      body: `was unassigned from you`,
      url: `/admin/tickets/${ticketId}`,
    }),
    resolved: (ticketId: string) => ({
      title: `🎫 ticket #${ticketId}`,
      body: `was marked as resolved!`,
      url: `/admin/tickets/${ticketId}`,
    }),
    reply: (ticketId: string, author: string, msg: string) => ({
      title: `${author} replied to ticket #${ticketId}`,
      body: msg.length > 80 ? msg.slice(0, 80) + '...' : msg,
      url: `/admin/tickets/${ticketId}`,
    }),
  },
  assignment: {
    assigned: (assignId: number) => ({
      title: `📝 assignment #${assignId}`,
      body: `u got a new assignment!`,
      url: `/admin/assignments/${assignId}/edit`,
    }),
    reassigned: (assignId: number) => ({
      title: `📝 assignment #${assignId}`,
      body: `was reassigned to you!`,
      url: `/admin/assignments/${assignId}/edit`,
    }),
    unassigned: (assignId: number) => ({
      title: `📝 assignment #${assignId}`,
      body: `was unassigned from you`,
      url: `/admin/assignments/${assignId}/edit`,
    }),
  },
  shipCert: {
    mentioned: (certId: number, author: string) => ({
      title: `🚢 cert #${certId}`,
      body: `@${author} mentioned u in a note!`,
      url: `/admin/ship_certifications/${certId}/edit`,
    }),
  },
  payout: {
    approved: (amount: number) => ({
      title: `🍪 payout approved!`,
      body: `ur ${amount} cookies payout was approved!`,
      url: `/admin/ship_certifications/mystats`,
    }),
  },
}
