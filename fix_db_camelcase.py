import re

with open('src/lib/db.ts', 'r') as f:
    content = f.read()

# Add toCamelCase function
to_camel_code = """
function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
}
"""

if "function toCamelCase" not in content:
    content = content.replace("function cleanParams", to_camel_code + "\nfunction cleanParams")

# Replace stmt.getAsObject() with toCamelCase(stmt.getAsObject())
content = content.replace("stmt.getAsObject()", "toCamelCase(stmt.getAsObject())")

with open('src/lib/db.ts', 'w') as f:
    f.write(content)

print("Fixed db.ts")
