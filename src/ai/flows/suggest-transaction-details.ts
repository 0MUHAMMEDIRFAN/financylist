'use server';
/**
 * @fileOverview A Genkit flow for suggesting transaction details (description and tags)
 * based on the transaction amount and customer information.
 *
 * - suggestTransactionDetails - A function that suggests descriptions and tags for a payment entry.
 * - SuggestTransactionDetailsInput - The input type for the suggestTransactionDetails function.
 * - SuggestTransactionDetailsOutput - The return type for the suggestTransactionDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestTransactionDetailsInputSchema = z.object({
  amount: z.number().describe('The amount of the transaction.'),
  customerName: z.string().describe('The name of the customer for whom the transaction is made.'),
  customerMobile: z.string().optional().describe('The optional mobile number of the customer.'),
});
export type SuggestTransactionDetailsInput = z.infer<typeof SuggestTransactionDetailsInputSchema>;

const SuggestTransactionDetailsOutputSchema = z.object({
  description: z.string().describe('A suggested description for the payment entry.'),
  tags: z.array(z.string()).describe('A list of suggested tags for categorizing the payment entry.'),
});
export type SuggestTransactionDetailsOutput = z.infer<typeof SuggestTransactionDetailsOutputSchema>;

export async function suggestTransactionDetails(input: SuggestTransactionDetailsInput): Promise<SuggestTransactionDetailsOutput> {
  return suggestTransactionDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTransactionDetailsPrompt',
  input: { schema: SuggestTransactionDetailsInputSchema },
  output: { schema: SuggestTransactionDetailsOutputSchema },
  prompt: `You are an AI financial assistant for the 'Financylist' application. Your task is to suggest a concise description and a list of relevant tags for a payment transaction.

Consider the transaction amount and customer details to provide the most appropriate suggestions.

Transaction Details:
Amount: {{{amount}}}
Customer Name: {{{customerName}}}
{{#if customerMobile}}Customer Mobile: {{{customerMobile}}}{{/if}}

Provide a description and relevant tags in JSON format.`,
});

const suggestTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'suggestTransactionDetailsFlow',
    inputSchema: SuggestTransactionDetailsInputSchema,
    outputSchema: SuggestTransactionDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate transaction details suggestions.');
    }
    return output;
  }
);
