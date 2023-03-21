<script>
    import { view, viewedDate } from '$lib/stores.js';
    
    export let date;
    export let rsvs;
    let id_internal = null;
    export {id_internal as id};
    export let category;

    const nDisplay = 4;

    function handleClick() {
        $viewedDate = date;
        $view = 'single-day';
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

<div style="height: 100%" class="dayOfMonth">
    <a href="/single-day/{category}" style="text-decoration: none">
        <div style="height:100%" on:click={handleClick} on:keypress={handleClick}>
            <p 
                style="margin: auto; width: 25px; text-align: center" 
                id={id_internal}>{date.getDate()}
            </p>
            {#each getDisplayTags(rsvs) as tag}
                <p class="rsv">{tag}</p>
            {/each}
        </div>
    </a>
</div>
