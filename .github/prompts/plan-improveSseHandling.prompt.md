## Plan: Improve Backend SSE Handling

The current in-memory SSE implementation has limitations that will cause issues with reliability and scaling. This plan addresses silent subscriber drops, inadequate buffer sizes for streaming, and prepares the system for horizontal scaling.

**Phases**

### Phase 1: Immediate Fixes

These steps address the most critical issues with a low implementation effort.

1.  **Increase Subscriber Buffer Size**: The current buffer size of 32 is too small for high-frequency token streaming, leading to dropped events. I will increase it to 256.
2.  **Auto-Unsubscribe Slow Consumers**: Implement a mechanism to automatically unsubscribe clients that are not consuming events fast enough, preventing the accumulation of "zombie" subscribers. A client will be dropped after 3 consecutive dropped events.
3.  **Unify Turn Streaming Logic**: Ensure a consistent user experience by emitting a `turn_added` event before streaming token chunks for all turn types.

### Phase 2: Robustness and Observability

These steps will make the SSE hub more resilient and provide better insight into its operation.

1.  **Add Metrics**: Introduce Prometheus metrics to track the number of subscribers and dropped events. This will provide visibility into the health of the SSE hub.
2.  **Implement Idle Timeouts**: Add a 30-second idle timeout to clean up connections from slow or disconnected clients, preventing resource leaks.
3.  **Limit Subscribers**: Implement a per-session subscriber limit (e.g., 100) to prevent memory exhaustion and return a `429 Too Many Requests` error when the limit is exceeded.

### Phase 3: Horizontal Scaling

This phase prepares the application for a multi-instance deployment.

1.  **Redis Pub/Sub Bridge**: Replace the in-memory event broadcasting with a Redis Pub/Sub backend. This will allow multiple instances of the application to share events, enabling horizontal scaling.

**Relevant files**
- `internal/sse/hub.go`: The core of the SSE implementation where most changes will be made.
- `internal/app/app.go`: Where the SSE hub is initialized and integrated with other components like the scheduler.
- `internal/modules/seminar/service/turns.go`: To be updated for unified turn streaming logic.
- `internal/modules/tutorial/service/tutorials.go`: To be updated for unified turn streaming logic.
- `internal/modules/seminar/handlers/events.go`: Where client subscriptions are handled.

**Verification**
1.  Write a unit test to confirm that slow subscribers are automatically dropped.
2.  Manually verify in a development environment that token streaming is smooth without dropped events.
3.  Confirm that the new Prometheus metrics are exposed and can be scraped.
4.  For Phase 3, set up a local multi-instance environment using Docker Compose to verify that events are correctly broadcast across all instances via Redis.
