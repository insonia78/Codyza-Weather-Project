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
  }
];
