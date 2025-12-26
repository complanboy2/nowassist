# Advanced Search Feature - HAR Analyzer

## Overview

The HAR Analyzer now supports **field-specific search queries** that allow users to search within specific fields or combine multiple field filters. This is similar to advanced search in Gmail, GitHub, or Jira.

---

## 🎯 Use Cases & Benefits

### Why This Feature is Useful

1. **Precision Filtering** - Find exact matches in specific fields without false positives
2. **Performance** - Narrow search scope = faster results
3. **Power User Efficiency** - Advanced users can quickly construct complex queries
4. **Debugging Workflow** - Common debugging patterns:
   - Find all failed requests: `Status=400` or `Status=500`
   - Find API calls to specific endpoint: `URL="/api/users"`
   - Find requests with errors in response: `Response="error"`
   - Combine filters: `Status=400 URL="api"`

---

## 📖 Search Syntax

### Basic Syntax

```
FieldName="value"    or    FieldName:value
```

### Supported Fields

| Field | Examples | Searches In |
|-------|----------|-------------|
| `URL` or `url` | `URL="/api/users"`, `url:api` | Request URL |
| `Status` or `status` | `Status=400`, `status:500` | HTTP status code |
| `Method` or `method` | `Method=POST`, `method:GET` | HTTP method |
| `Response` or `responsebody` | `Response="error"`, `response:null` | Response body content |
| `Request` or `requestbody` | `Request="userId"` | Request body content |
| `Domain` or `domain` | `Domain="example.com"` | Request domain/hostname |
| `Header` or `headers` | `Header="authorization"` | Request/Response headers |
| `Type` or `contenttype` | `Type="application/json"` | Content-Type header |

### Syntax Options

- **Quotes are optional**: `URL=api` or `URL="api"` both work
- **Case insensitive**: `URL=api`, `url=api`, `Url=Api` all work
- **Colon or equals**: `URL:api` or `URL=api` both work
- **Multiple filters**: Combine with spaces: `Status=400 URL="api"`

---

## 💡 Example Queries

### Real-World Debugging Scenarios

#### 1. Find Failed API Calls
```
Status=400
```
Finds all requests with status code 400

#### 2. Find Slow API Calls with Errors
```
Status=500 Response="timeout"
```
Finds 500 errors containing "timeout" in response

#### 3. Find Requests to Specific Endpoint
```
URL="/api/users" Method=GET
```
Finds GET requests to /api/users endpoint

#### 4. Find Requests from Specific Domain
```
Domain="cdn.example.com"
```
Finds all requests to cdn.example.com

#### 5. Find Requests with Authentication Issues
```
Status=401 Header="authorization"
```
Finds 401 errors related to authorization headers

#### 6. Find Large JSON Responses
```
Type="application/json" Response=""
```
Combined with size filter to find large JSON responses

#### 7. Complex Query - Multiple Conditions
```
Status=400 URL="api" Response="error"
```
Finds 400 errors from API endpoints with "error" in response body

---

## 🚀 Advanced Features

### 1. **General + Field Search**
When you combine field filters with general text, it searches:
- Field filters apply first (AND logic)
- Then general search searches remaining fields

Example:
```
Status=400 error
```
Finds requests with status 400 AND containing "error" anywhere

### 2. **Flexible Syntax**
All these work the same:
- `URL="/api/users"`
- `url="/api/users"`
- `URL:/api/users`
- `url:/api/users`
- `URL=/api/users`

### 3. **Partial Matching**
All searches use "contains" matching (not exact):
- `URL="api"` matches `/api/users`, `/api/v1/products`, etc.
- `Response="error"` matches any response containing "error"

---

## 🎨 UI Enhancements

### 1. **Help Button**
- "Advanced" button next to search label
- Click to show/hide search syntax examples
- Collapsible help panel with all examples

### 2. **Smart Placeholder**
- Shows example syntax in placeholder text
- Updates based on context

### 3. **Visual Feedback**
- Search highlighting still works for field-specific searches
- URL and other fields highlight matches
- Tab indicators show which tabs contain matches

---

## 💻 Implementation Details

### Query Parsing Logic

1. **Parse field filters** using regex: `/(\w+)[:=]\s*"?([^"=,]+)"?/gi`
2. **Extract general search** text (remaining after field filters removed)
3. **Apply field filters first** (AND logic - all must match)
4. **Then apply general search** (searches all fields)

### Supported Field Names

The parser recognizes these field names (case-insensitive):
- URL, url
- Status, status
- Method, method
- Response, responsebody, ResponseBody
- Request, requestbody, RequestBody
- Domain, domain
- Header, headers, Header
- Type, contenttype, ContentType

### Search Behavior

- **Field filters**: AND logic (all must match)
- **General search**: Searches across all fields
- **Combined**: Field filters first, then general search on remaining fields

---

## 🔮 Future Enhancements (Suggestions)

### Potential Improvements

1. **Autocomplete/Suggestions**
   - Show field names as user types
   - Suggest values for status codes, methods
   - Show available domains in dropdown

2. **Operators**
   - `Status>400` - Greater than
   - `Status<300` - Less than
   - `URL~"regex"` - Regular expression matching
   - `Size>1MB` - Numeric comparisons

3. **Boolean Operators**
   - `Status=400 OR Status=500` - OR logic
   - `NOT Status=200` - Negation
   - `(Status=400 OR Status=500) AND URL="api"` - Parentheses grouping

4. **Saved Searches**
   - Save common queries
   - Quick filter buttons for saved searches

5. **Query Builder UI**
   - Visual query builder instead of text
   - Dropdown selects for fields
   - Easier for non-technical users

6. **Search History**
   - Remember recent searches
   - Autocomplete from history

7. **Syntax Highlighting**
   - Highlight field names, operators in search box
   - Color-code different parts of query

8. **Query Validation**
   - Show errors for invalid syntax
   - Suggest corrections

---

## ✅ Benefits Summary

1. **More Precise** - Find exactly what you need without noise
2. **Faster** - Narrow search scope = quicker results
3. **Professional** - Matches industry-standard search patterns
4. **Flexible** - Multiple syntax options for user preference
5. **Discoverable** - Help button shows examples
6. **Powerful** - Combine multiple filters for complex queries

---

## 📝 Usage Tips

### For Beginners
- Start with general search: just type keywords
- Use field filters when you know what you're looking for
- Click "Advanced" button to see examples

### For Power Users
- Combine multiple field filters for precise searches
- Use quotes for multi-word values
- Mix field filters with general search for flexibility

### Common Patterns
- **Debugging errors**: `Status=400` or `Status=500`
- **Finding endpoints**: `URL="/api/"`
- **Checking responses**: `Response="null"` or `Response="error"`
- **Domain analysis**: `Domain="third-party.com"`
- **Authentication issues**: `Status=401 Header="authorization"`

---

**This feature significantly improves the HAR Analyzer's usability for professional developers and QA engineers!** 🎉
