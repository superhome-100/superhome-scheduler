<script>
    import { goto } from '$app/navigation';
    import { view, viewedDate } from '$lib/stores.js';

    export let date;
    export let rsvs;
    export let category;

    const nDisplay = 3;

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

    const catBg = (cat) => cat === 'pool' ? 'bg-pool-bg-to' : cat === 'openwater' ? 'bg-openwater-bg-to' : cat === 'classroom' ? 'bg-classroom-bg-to' : undefined;

    const dateStyle = (date) => { 
        let today = new Date();
        if (date.getFullYear() == today.getFullYear() 
            && date.getMonth() == today.getMonth() 
            && date.getDate() == today.getDate()
        ) {
            return 'rounded-[50%] bg-stone-300 dark:bg-stone-600';
        } else {
            return '';
        }
    };

</script>

<div class='overflow-hidden h-full'>
    <a class='no-underline' href="/single-day/{category}">
        <div class='h-full' on:click={handleClick} on:keypress={handleClick}>
            <p class='flex justify-center w-6 m-auto {dateStyle(date)}'>
                {date.getDate()}
            </p>
            {#if rsvs.length > 0}
                <div 
                    class='mx-auto mt-4 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv {category}'
                >+{rsvs.length}
                </div>
            {/if}
        </div>
    </a>
</div>
