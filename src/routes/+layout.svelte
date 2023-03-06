<script lang="js">
    import '../styles.css';
</script>

<div id="app">
    <div id="category_buttons">
        <a href="/">
            <button>My Reservations</button>
        </a>
        <a href="/pool">
            <button>Pool</button>
        </a>
        <a href="/open-water">
            <button>Open Water</button>
        </a>
        <a href="/classroom">
            <button>Classroom</button>
        </a>
    </div>
    <slot />
</div>