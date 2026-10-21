/** A domed loaf whose two score marks are clock hands. Same shapes as public/favicon.svg, without the background. */
export function Logo() {
    return (
        <svg class="logo" viewBox="80 100 352 312" aria-hidden="true" focusable="false">
            <path d="M88 322C88 188 164 106 256 106s168 82 168 216c0 52-36 84-90 84H178c-54 0-90-32-90-84z" fill="#C98A52" />
            <path d="M106 320C106 200 172 124 256 124s150 76 150 196c0 42-30 68-76 68H182c-46 0-76-26-76-68z" fill="#E8B07A" />
            <g stroke="#FBF5EA" stroke-width="34" stroke-linecap="round" fill="none">
                <path d="M256 276V160" />
                <path d="M256 276l72 42" />
            </g>
            <circle cx="256" cy="276" r="22" fill="#FBF5EA" />
        </svg>
    );
}
