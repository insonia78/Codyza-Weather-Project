export const supportedRoutes = [
  {
    pattern: /^\/health\/?$/,
    methods: [
      "GET"
    ]
  },
  {
    pattern: /^\/accounts\/?$/,
    methods: [
      "POST"
    ]
  },
  {
    pattern: /^\/accounts\/login\/?$/,
    methods: [
      "POST"
    ]
  },
  {
    pattern: /^\/accounts\/\d+\/?$/,
    methods: [
      "PUT",
      "PATCH",
      "DELETE"
    ]
  },
  {
    pattern: /^\/auth\/logout\/?$/,
    methods: [
      "POST"
    ]
  },
  {
    pattern: /^\/weather\/status\/?$/,
    methods: [
      "GET"
    ]
  },
  {
    pattern: /^\/weather\/search\/?$/,
    methods: [
      "GET"
    ]
  },
  {
    pattern: /^\/weather\/reverse\/?$/,
    methods: [
      "GET"
    ]
  },
  {
    pattern: /^\/weather\/dashboard\/?$/,
    methods: [
      "POST"
    ]
  },
  {
    pattern: /^\/admin\/dashboard\/?$/,
    methods: [
      "GET"
    ]
  },
  {
    pattern: /^\/weather\/search-history\/?$/,
    methods: [
      "GET",
      "POST",
      "DELETE"
    ]
  }
];
