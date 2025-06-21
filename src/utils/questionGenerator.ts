
export const generateSuggestedQuestions = (lastAiResponse: string): string[] => {
  const response = lastAiResponse.toLowerCase();
  const questions: string[] = [];

  // Meditation and mindfulness related questions
  if (response.includes('meditat') || response.includes('mindful')) {
    questions.push(
      "Can you guide me through a 5-minute breathing meditation?",
      "What are some mindfulness techniques for beginners?",
      "How can I maintain focus during meditation?"
    );
  }

  // Stress and anxiety related questions
  if (response.includes('stress') || response.includes('anxiet') || response.includes('worry')) {
    questions.push(
      "What are some quick stress-relief techniques?",
      "How can I manage anxiety in social situations?",
      "What breathing exercises help with stress?"
    );
  }

  // Sleep related questions
  if (response.includes('sleep') || response.includes('rest') || response.includes('insomnia')) {
    questions.push(
      "Can you help me create a bedtime routine?",
      "What are some natural ways to improve sleep?",
      "How can I calm my mind before bed?"
    );
  }

  // Relationship and communication questions
  if (response.includes('relationship') || response.includes('communication') || response.includes('conflict')) {
    questions.push(
      "How can I improve communication with my partner?",
      "What are healthy ways to resolve conflicts?",
      "How do I set healthy boundaries?"
    );
  }

  // Self-care and wellness questions
  if (response.includes('self-care') || response.includes('wellness') || response.includes('health')) {
    questions.push(
      "What are some simple daily self-care practices?",
      "How can I build a sustainable wellness routine?",
      "What are signs I need to prioritize self-care?"
    );
  }

  // Work and productivity questions
  if (response.includes('work') || response.includes('productiv') || response.includes('focus')) {
    questions.push(
      "How can I improve work-life balance?",
      "What techniques help with procrastination?",
      "How do I stay motivated during difficult tasks?"
    );
  }

  // Emotional regulation questions
  if (response.includes('emotion') || response.includes('anger') || response.includes('sad')) {
    questions.push(
      "How can I better understand my emotions?",
      "What are healthy ways to express difficult feelings?",
      "How do I practice emotional self-regulation?"
    );
  }

  // Default questions if no specific topics are detected
  if (questions.length === 0) {
    questions.push(
      "Can you tell me more about this topic?",
      "How can I apply this in my daily life?",
      "What other techniques might be helpful?"
    );
  }

  // Return up to 3 random questions to avoid overwhelming the user
  const shuffled = questions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};
