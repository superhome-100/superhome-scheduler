export function load({ params: { category } }) {
	// The Solution: Immediate Destructuring
	// To fix this, you must extract the values you need from params at the very top of your function (synchronously). This ensures SvelteKit "sees" the dependency immediately.
	return { category };
}
