

export function wrapCode(language: string, code: string) {
  if (language === "python") {
    if (code.includes("def solve") || code.includes("def solution")) {
      return `
import sys
import json

${code}

if __name__ == "__main__":
    try:
        input_str = sys.stdin.read().strip()
        if input_str:
            input_data = json.loads(input_str)
            func = locals().get('solve') or locals().get('solution')
            if func:
                result = func(input_data)
                if result is not None:
                    print(json.dumps(result))
    except Exception as e:
        sys.stderr.write(f"Runtime Error: {str(e)}\\n")
        sys.exit(1)
`;
    }
  }
  return code;
}
