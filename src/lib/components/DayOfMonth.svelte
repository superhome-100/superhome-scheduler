<script>
    import { goto } from '$app/navigation';
    import { view, viewedDate } from '$lib/stores.js';
    
    export let date;
    export let rsvs;
    export let category;
    let id_internal;
    export {id_internal as id};

    const nDisplay = 4;

    function handleClick() {
        $viewedDate = date;
        goto('/single-day/{category}');
    }

    function getDisplayTags(rsvs) {
        let tags = [];
        let N = rsvs.length > nDisplay + 1 ? nDisplay : rsvs.length;
        for (let i=0; i < N; i++) {
            let tag = rsvs[i].user.name;
            if (rsvs[i].resType === 'course') {
                tag += ' +' + rsvs[i].numStudents;
            }
            tags.push(tag);
        }
        if (rsvs.length > N) {
            let lastTag = '+ ' + (rsvs.length-N) + ' more...';
            tags.push(lastTag);
        }
        return tags;
    }

</script>

<div class="dayOfMonth">
    <a href="/single-day/{category}" style="text-decoration: none">
        <div style="height:100%" on:click={handleClick} on:keypress={handleClick}>
            <p class="date" id={id_internal}>{date.getDate()}</p>
            {#each getDisplayTags(rsvs) as tag}
                <p class="rsv">{tag}</p>
            {/each}
        </div>
    </a>
</div>
