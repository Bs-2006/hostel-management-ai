export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  attachmentName?: string;
}

const DUMMY_ANSWERS: Array<{ match: RegExp; answer: (name: string) => string }> = [
  {
    match: /attend|present|absent/i,
    answer: (name) =>
      `Here is your attendance summary, ${name}:\n\n• Present: 21 days\n• Absent: 4 days\n• Total: 25 records\n\nYour attendance is currently 84%. Would you like me to show the recent records in detail?`,
  },
  {
    match: /outing|leave|go out/i,
    answer: (name) =>
      `Here are your outing requests, ${name}:\n\n• Home visit — 2025-08-20 — Approved\n• Weekend trip — 2025-08-25 — Pending\n• Family function — 2025-09-02 — Pending\n\nI can help you submit a new outing request if you'd like.`,
  },
  {
    match: /complaint|issue|problem|repair/i,
    answer: (name) =>
      `You currently have ${name === '' ? 'the following' : 'the following'} complaints:\n\n• Water leakage in washroom — In Progress\n• Wi-Fi not working — Resolved\n• Fan broken in room — Pending\n\nWant me to log a new complaint for you?`,
  },
  {
    match: /room|hostel|accommodat/i,
    answer: () =>
      `You are assigned to Room 204, Block B. The hostel profile shows 1 floor with a capacity of 60 students. You can view the full room list under the Services tab.`,
  },
  {
    match: /food|menu|meal|lunch|dinner/i,
    answer: () =>
      `Here is today's food menu:\n\n• Breakfast: Idli + Sambar\n• Lunch: Rice, Dal, Curry, Salad\n• Snacks: Tea + Biscuits\n• Dinner: Chapati + Paneer curry\n\nCheck the Services tab for the full weekly menu.`,
  },
  {
    match: /fee|pay|amount|due/i,
    answer: (name) =>
      `Your fee status for ${name || 'the current semester'}:\n\n• Hostel fee: ₹45,000 — Paid\n• Mess fee: ₹12,000 — Due (2025-09-05)\n\nWould you like a reminder before the due date?`,
  },
];

const FALLBACK: (name: string) => string = (name) =>
  `Hi ${name}, I'm your hostel assistant! I can help you with:\n\n• Attendance records\n• Outing requests\n• Complaints\n• Your room details\n• Food menu\n• Fee status\n\nJust ask me anything and I'll fetch the latest info for you.`;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface MockAgent {
  getWelcome(): ChatMessage;
  reply(userMessage: string, userName: string): Promise<ChatMessage>;
}

export function createMockAgent(): MockAgent {
  return {
    getWelcome() {
      return {
        id: makeId(),
        role: 'assistant',
        content:
          'Hi! I\'m your hostel assistant. Ask me anything about your attendance, outings, complaints, room, food menu, or fees.',
      };
    },
    reply(userMessage, userName) {
      return new Promise((resolve) => {
        const matched = DUMMY_ANSWERS.find((entry) => entry.match.test(userMessage));
        const content = matched
          ? matched.answer(userName)
          : FALLBACK(userName);
        const reply: ChatMessage = { id: makeId(), role: 'assistant', content };
        setTimeout(() => resolve(reply), 800);
      });
    },
  };
}
