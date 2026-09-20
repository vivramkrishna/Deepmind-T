import { evaluate } from 'mathjs';

export function calculate(question) {
  if (typeof question !== 'string' || question.length > 250) throw new Error('Enter a math question under 250 characters.');
  let expression = question.toLowerCase().trim()
    .replace(/^(what is|what's|calculate|solve)\s+/, '')
    .replace(/[?=]+$/, '').trim()
    .replace(/multiplied by|times/g, '*').replace(/divided by|over/g, '/')
    .replace(/plus/g, '+').replace(/minus/g, '-')
    .replace(/to the power of|raised to/g, '^')
    .replace(/squared/g, '^2').replace(/cubed/g, '^3')
    .replace(/square root of\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/(\d+(?:\.\d+)?)\s*(?:percent|%)\s*of\s*/g, '($1/100)*')
    .replace(/(\d+(?:\.\d+)?)\s*(?:percent|%)/g, '($1/100)')
    .replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!expression || /[^0-9\s.+*/()^\-sqrt]/.test(expression) || /[a-z]/.test(expression.replace(/sqrt/g, '')) || expression.includes('**')) {
    throw new Error('Try a basic expression such as 12 + 8, 15% of 200, or sqrt(81). Use digits for numbers.');
  }
  if ((expression.match(/\(/g) || []).length > 20) throw new Error('Please use a shorter expression.');
  let value;
  try { value = evaluate(expression); } catch { throw new Error('Check the numbers and parentheses in your question.'); }
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('That calculation has no finite real-number answer.');
  return { expression, answer: Number(value.toPrecision(12)).toString() };
}
