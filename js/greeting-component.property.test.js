import { describe, it, expect } from 'vitest';
import { GreetingComponent } from './greeting-component.js';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for GreetingComponent
 * Feature: dashboard-interactive-enhancements
 */
describe('GreetingComponent - Property-Based Tests', () => {
  let greeting;

  // Create a mock storage manager for testing
  const createMockStorage = () => ({
    get: () => null,
    set: () => true,
    remove: () => true,
    isAvailable: () => true,
  });

  /**
   * Property 4: Name Sanitization Prevents HTML Injection
   * **Validates: Requirements 2.7**
   * 
   * For any string input containing HTML tags or script elements,
   * the name sanitization function SHALL produce output that,
   * when rendered in the DOM, does not execute scripts or render as HTML elements.
   */
  describe('Property 4: Name Sanitization Prevents HTML Injection', () => {
    it('should prevent HTML injection for any input string', () => {
      greeting = new GreetingComponent(createMockStorage());

      // Generator for potentially malicious strings
      const maliciousStringArbitrary = fc.oneof(
        // Script tags with various payloads
        fc.string().map(s => `<script>${s}</script>`),
        fc.string().map(s => `<script>alert('${s}')</script>`),
        fc.string().map(s => `<script>document.cookie='${s}'</script>`),
        
        // HTML tags with event handlers
        fc.string().map(s => `<img src=x onerror="${s}">`),
        fc.string().map(s => `<div onclick="${s}">text</div>`),
        fc.string().map(s => `<a href="javascript:${s}">link</a>`),
        
        // Various HTML tags
        fc.string().map(s => `<b>${s}</b>`),
        fc.string().map(s => `<div>${s}</div>`),
        fc.string().map(s => `<span>${s}</span>`),
        fc.string().map(s => `<iframe src="${s}"></iframe>`),
        
        // Nested HTML tags
        fc.string().map(s => `<div><span><b>${s}</b></span></div>`),
        
        // Mixed content
        fc.tuple(fc.string(), fc.string(), fc.string()).map(
          ([a, b, c]) => `${a}<script>${b}</script>${c}`
        ),
        fc.tuple(fc.string(), fc.string()).map(
          ([a, b]) => `<div onclick="alert('${a}')">${b}</div>`
        ),
        
        // Self-closing tags
        fc.string().map(s => `<img src="${s}" />`),
        fc.string().map(s => `<br/>${s}<hr/>`),
        
        // Data URIs
        fc.string().map(s => `<img src="data:text/html,${s}">`),
        
        // Style tags
        fc.string().map(s => `<style>${s}</style>`),
        
        // Plain strings (control case)
        fc.string()
      );

      fc.assert(
        fc.property(maliciousStringArbitrary, (input) => {
          // Sanitize the input
          const sanitized = greeting.sanitizeName(input);

          // CORE SECURITY PROPERTY: When the sanitized output is used in the DOM,
          // it should not execute scripts or create dangerous HTML elements.
          
          // Test 1: Setting as textContent should not create child elements
          const testDiv1 = document.createElement('div');
          testDiv1.textContent = sanitized;
          expect(testDiv1.children.length).toBe(0);
          
          // Test 2: Result should be a string
          expect(typeof sanitized).toBe('string');
          
          // Test 3: The sanitized output, when rendered, should not execute scripts
          // We verify this by checking that no script elements are created
          const container = document.createElement('div');
          container.innerHTML = sanitized;
          const scripts = container.getElementsByTagName('script');
          expect(scripts.length).toBe(0);
          
          // Test 4: No iframe elements should be created (XSS vector)
          const iframes = container.getElementsByTagName('iframe');
          expect(iframes.length).toBe(0);
          
          // Test 5: No img elements should be created (onerror XSS vector)
          const imgs = container.getElementsByTagName('img');
          expect(imgs.length).toBe(0);
          
          // Test 6: No style elements should be created (CSS injection vector)
          const styles = container.getElementsByTagName('style');
          expect(styles.length).toBe(0);
          
          // Test 7: No object/embed elements should be created
          const objects = container.getElementsByTagName('object');
          const embeds = container.getElementsByTagName('embed');
          expect(objects.length).toBe(0);
          expect(embeds.length).toBe(0);
        }),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should preserve safe text content while removing HTML', () => {
      greeting = new GreetingComponent(createMockStorage());

      // Generator for strings with HTML tags wrapping safe text
      const htmlWrappedTextArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('<') && !s.includes('>')),
        fc.constantFrom('b', 'i', 'div', 'span', 'strong', 'em', 'p', 'h1', 'script')
      ).map(([text, tag]) => ({
        input: `<${tag}>${text}</${tag}>`,
        expectedText: text
      }));

      fc.assert(
        fc.property(htmlWrappedTextArbitrary, ({ input, expectedText }) => {
          const sanitized = greeting.sanitizeName(input);
          
          // The sanitized output should contain the text content
          expect(sanitized).toBe(expectedText);
          
          // Should not contain the HTML tags
          expect(sanitized).not.toContain('<');
          expect(sanitized).not.toContain('>');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle any string input without throwing errors', () => {
      greeting = new GreetingComponent(createMockStorage());

      // Generator for any string including edge cases
      const anyStringArbitrary = fc.oneof(
        fc.string(),
        fc.string({ minLength: 0, maxLength: 0 }), // empty string
        fc.constant(''),
        fc.constant(' '),
        fc.constant('\n\t\r'),
        fc.string().map(s => s.repeat(10)) // long strings
      );

      fc.assert(
        fc.property(anyStringArbitrary, (input) => {
          // Should not throw any errors
          expect(() => {
            const result = greeting.sanitizeName(input);
            // Result should always be a string
            expect(typeof result).toBe('string');
          }).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should produce idempotent results (sanitizing twice gives same result)', () => {
      greeting = new GreetingComponent(createMockStorage());

      fc.assert(
        fc.property(fc.string(), (input) => {
          const sanitizedOnce = greeting.sanitizeName(input);
          const sanitizedTwice = greeting.sanitizeName(sanitizedOnce);
          
          // Sanitizing an already sanitized string should produce the same result
          expect(sanitizedTwice).toBe(sanitizedOnce);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle non-string inputs gracefully', () => {
      greeting = new GreetingComponent(createMockStorage());

      const nonStringArbitrary = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.integer(),
        fc.float(),
        fc.boolean(),
        fc.object(),
        fc.array(fc.anything()),
        fc.constant(NaN),
        fc.constant(Infinity)
      );

      fc.assert(
        fc.property(nonStringArbitrary, (input) => {
          const result = greeting.sanitizeName(input);
          
          // Should return empty string for non-string inputs
          expect(result).toBe('');
          expect(typeof result).toBe('string');
        }),
        { numRuns: 100 }
      );
    });
  });
});
