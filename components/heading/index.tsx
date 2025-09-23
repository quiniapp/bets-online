
interface HeadingTitleProps {
    title: string
    body?: string
}
const HeadingTitle = ({ title, body }: HeadingTitleProps) => {
    return (
        <div className="flex items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                {body && (<p className="text-muted-foreground">
                    {body}
                </p>)}
            </div>
        </div>
    )
}
export default HeadingTitle