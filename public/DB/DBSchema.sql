create table public.blocks (
  id uuid not null default extensions.uuid_generate_v4 (),
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint blocks_pkey primary key (id),
  constraint blocks_blocker_id_blocked_id_key unique (blocker_id, blocked_id),
  constraint blocks_blocked_id_fkey foreign KEY (blocked_id) references users (id) on delete CASCADE,
  constraint blocks_blocker_id_fkey foreign KEY (blocker_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.chat_participants (
  room_id uuid not null,
  user_id uuid not null,
  joined_at timestamp with time zone null default timezone ('utc'::text, now()),
  last_read_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint chat_participants_pkey primary key (room_id, user_id),
  constraint chat_participants_room_id_fkey foreign KEY (room_id) references chat_rooms (id) on delete CASCADE,
  constraint chat_participants_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.chat_rooms (
  id uuid not null default extensions.uuid_generate_v4 (),
  type public.room_type not null,
  category public.room_category null default 'NONE'::room_category,
  name character varying(100) null,
  password character varying(100) null,
  max_capacity integer null,
  last_message_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint chat_rooms_pkey primary key (id)
) TABLESPACE pg_default;


create table public.comments (
  id uuid not null default extensions.uuid_generate_v4 (),
  content text not null,
  post_id uuid not null,
  author_id uuid not null,
  parent_id uuid null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint comments_pkey primary key (id),
  constraint comments_author_id_fkey foreign KEY (author_id) references users (id) on delete CASCADE,
  constraint comments_parent_id_fkey foreign KEY (parent_id) references comments (id) on delete CASCADE,
  constraint comments_post_id_fkey foreign KEY (post_id) references posts (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.friendships (
  id uuid not null default extensions.uuid_generate_v4 (),
  sender_id uuid not null,
  receiver_id uuid not null,
  status character varying(20) null default 'PENDING'::character varying,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint friendships_pkey primary key (id),
  constraint friendships_sender_id_receiver_id_key unique (sender_id, receiver_id),
  constraint friendships_receiver_id_fkey foreign KEY (receiver_id) references users (id) on delete CASCADE,
  constraint friendships_sender_id_fkey foreign KEY (sender_id) references users (id) on delete CASCADE,
  constraint friendships_status_check check (
    (
      (status)::text = any (
        (
          array[
            'PENDING'::character varying,
            'ACCEPTED'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;


create table public.messages (
  id uuid not null default extensions.uuid_generate_v4 (),
  room_id uuid not null,
  sender_id uuid not null,
  content text not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  sender_name character varying(255) null,
  constraint messages_pkey primary key (id),
  constraint messages_room_id_fkey foreign KEY (room_id) references chat_rooms (id) on delete CASCADE,
  constraint messages_sender_id_fkey foreign KEY (sender_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_messages_room_created on public.messages using btree (room_id, created_at desc) TABLESPACE pg_default;
create index IF not exists idx_messages_created_at on public.messages using btree (created_at) TABLESPACE pg_default;
create index IF not exists idx_messages_room_id on public.messages using btree (room_id) TABLESPACE pg_default;


create table public.posts (
  id uuid not null default extensions.uuid_generate_v4 (),
  title character varying(255) not null,
  content text not null,
  images text[] null,
  author_id uuid not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint posts_pkey primary key (id),
  constraint posts_author_id_fkey foreign KEY (author_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  email character varying(255) not null,
  nickname character varying(50) not null,
  avatar_config jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  position_x numeric null default 0,
  position_y numeric null default 0,
  username character varying(255) not null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_username_key unique (username)
) TABLESPACE pg_default;